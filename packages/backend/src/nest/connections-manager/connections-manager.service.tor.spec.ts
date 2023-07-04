import PeerId from 'peer-id'
import { type DirResult } from 'tmp'
import crypto from 'crypto'

import { jest, beforeEach, describe, it, expect, afterEach } from '@jest/globals'
import { communities, getFactory, identity, prepareStore, Store } from '@quiet/state-manager'
import {
  createLibp2pAddress,
  createPeerId,
  createTmpDir,
  libp2pInstanceParams,
  removeFilesFromDir,
  tmpQuietDirPath,
} from '../common/utils'

import { type Community, type Identity, type InitCommunityPayload } from '@quiet/types'
import { LazyModuleLoader } from '@nestjs/core'
import { TestingModule, Test } from '@nestjs/testing'
import { FactoryGirl } from 'factory-girl'
import { TestModule } from '../common/test.module'
import { TOR_PASSWORD_PROVIDER, QUIET_DIR } from '../const'
import { Libp2pModule } from '../libp2p/libp2p.module'
import { Libp2pService } from '../libp2p/libp2p.service'
import { LocalDbModule } from '../local-db/local-db.module'
import { LocalDbService } from '../local-db/local-db.service'
import { RegistrationModule } from '../registration/registration.module'
import { RegistrationService } from '../registration/registration.service'
import { SocketModule } from '../socket/socket.module'
import { WebSockets } from '../websocketOverTor'
import { ConnectionsManagerModule } from './connections-manager.module'
import { ConnectionsManagerService } from './connections-manager.service'
import { TorModule } from '../tor/tor.module'
import { Tor } from '../tor/tor.service'
import { TorControl } from '../tor/tor-control.service'
import { sleep } from '../common/sleep'

jest.setTimeout(100_000)

let tmpDir: DirResult
let tmpAppDataPath: string

let module: TestingModule
let connectionsManagerService: ConnectionsManagerService
let tor: Tor
let localDbService: LocalDbService
let registrationService: RegistrationService
let libp2pService: Libp2pService
let lazyModuleLoader: LazyModuleLoader
let quietDir: string
let store: Store
let factory: FactoryGirl
let community: Community
let userIdentity: Identity
let communityRootCa: string
let peerId: PeerId
let torControl: TorControl

beforeEach(async () => {
  jest.clearAllMocks()
  tmpDir = createTmpDir()
  tmpAppDataPath = tmpQuietDirPath(tmpDir.name)
  store = prepareStore().store
  factory = await getFactory(store)
  communityRootCa = 'rootCa'
  community = await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community', {
    rootCa: communityRootCa,
  })
  userIdentity = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
    id: community.id,
    nickname: 'john',
  })

  module = await Test.createTestingModule({
    imports: [
      TestModule,
      ConnectionsManagerModule,
      LocalDbModule,
      RegistrationModule,
      SocketModule,
      Libp2pModule,
      TorModule,
    ],
  })
    .overrideProvider(TOR_PASSWORD_PROVIDER)
    .useValue({ torPassword: '', torHashedPassword: '' })
    .compile()

  connectionsManagerService = await module.resolve(ConnectionsManagerService)
  localDbService = await module.resolve(LocalDbService)
  registrationService = await module.resolve(RegistrationService)
  tor = await module.resolve(Tor)

  console.log('tor ', tor)
  await tor.init()

  const torPassword = crypto.randomBytes(16).toString('hex')
  torControl = await module.resolve(TorControl)
  torControl.authString = 'AUTHENTICATE ' + torPassword + '\r\n'

  lazyModuleLoader = await module.resolve(LazyModuleLoader)
  const { Libp2pModule: Module } = await import('../libp2p/libp2p.module')
  const moduleRef = await lazyModuleLoader.load(() => Module)
  const { Libp2pService } = await import('../libp2p/libp2p.service')
  libp2pService = moduleRef.get(Libp2pService)
  const params = await libp2pInstanceParams()
  peerId = params.peerId

  connectionsManagerService.libp2pService = libp2pService

  quietDir = await module.resolve(QUIET_DIR)
})

afterEach(async () => {
  await libp2pService?.libp2pInstance?.stop()
  if (connectionsManagerService) {
    await connectionsManagerService.closeAllServices()
  }
  await tor.kill()
  removeFilesFromDir(quietDir)
})

describe('Connections manager', () => {
  it('runs tor by default', async () => {
    await connectionsManagerService.init()
    console.log(connectionsManagerService.isTorInit)
  })

  it('creates network', async () => {
    const spyOnDestroyHiddenService = jest.spyOn(tor, 'destroyHiddenService')
    await connectionsManagerService.init()
    const network = await connectionsManagerService.getNetwork()
    console.log('network', network)
    expect(network.hiddenService.onionAddress.split('.')[0]).toHaveLength(56)
    expect(network.hiddenService.privateKey).toHaveLength(99)
    const peerId = await PeerId.createFromJSON(network.peerId)
    expect(PeerId.isPeerId(peerId)).toBeTruthy()
    expect(await spyOnDestroyHiddenService.mock.results[0].value).toBeTruthy()
  })

  it('dials many peers on start', async () => {
    const store = prepareStore().store
    const factory = await getFactory(store)
    const community = await factory.create<Community>('Community', { rootCa: 'rootCa' })
    const userIdentity = await factory.create<Identity>('Identity', { id: community.id, nickname: 'john' })
    const spyOnDial = jest.spyOn(WebSockets.prototype, 'dial')

    const peerList: string[] = []
    const peersCount = 7
    for (let pCount = 0; pCount < peersCount; pCount++) {
      console.log('pushing peer ', pCount)
      peerList.push(
        createLibp2pAddress(`${Math.random().toString(36).substring(2, 13)}.onion`, (await createPeerId()).toString())
      )
    }

    const launchCommunityPayload: InitCommunityPayload = {
      id: community.id,
      peerId: userIdentity.peerId,
      hiddenService: userIdentity.hiddenService,
      certs: {
        // @ts-expect-error Identity.userCertificate can be null
        certificate: userIdentity.userCertificate,
        // @ts-expect-error Identity.userCertificate userCsr.userKey can be undefined
        key: userIdentity.userCsr?.userKey,
        // @ts-expect-error
        CA: [community.rootCa],
      },
      peers: peerList,
    }
    await connectionsManagerService.init()
    await connectionsManagerService.launchCommunity(launchCommunityPayload)
    expect(spyOnDial).toHaveBeenCalledTimes(peersCount)
    // Temporary fix for hanging test - websocketOverTor doesn't have abortController
    await sleep(5000)
  })

  it.skip('Bug reproduction - iOS app crashing because lack of data server', async () => {
    const store = prepareStore().store
    const factory = await getFactory(store)
    const community = await factory.create<Community>('Community', { rootCa: 'rootCa' })
    const userIdentity = await factory.create<Identity>('Identity', { id: community.id, nickname: 'john' })

    await connectionsManagerService.init()
    const spyOnDial = jest.spyOn(WebSockets.prototype, 'dial')

    const peerList: string[] = []
    const peersCount = 8
    for (let pCount = 0; pCount < peersCount; pCount++) {
      peerList.push(
        createLibp2pAddress(`${Math.random().toString(36).substring(2, 13)}.onion`, (await createPeerId()).toString())
      )
    }

    const launchCommunityPayload: InitCommunityPayload = {
      id: community.id,
      peerId: userIdentity.peerId,
      hiddenService: userIdentity.hiddenService,
      certs: {
        // @ts-expect-error Identity.userCertificate can be null
        certificate: userIdentity.userCertificate,
        // @ts-expect-error
        key: userIdentity.userCsr?.userKey,
        // @ts-expect-error
        CA: [community.rootCa],
      },
      peers: peerList,
    }

    await connectionsManagerService.launchCommunity(launchCommunityPayload)
    expect(spyOnDial).toHaveBeenCalledTimes(peersCount)
    await connectionsManagerService.closeAllServices()
    await sleep(5000)

    const launchSpy = jest.spyOn(connectionsManagerService, 'launch')
    await connectionsManagerService.init()
    expect(launchSpy).toBeCalledTimes(1)
    // Temporary fix for hanging test - websocketOverTor doesn't have abortController
    await sleep(5000)
  })
})
