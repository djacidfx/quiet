export interface CertData {
  publicKey: any
  privateKey: any
  pkcs10: any
}

export interface UserCsr {
  userCsr: string
  userKey: string
  pkcs10: CertData
}

export interface CreateDmKeyPairPayload {
  dmPublicKey: string
  dmPrivateKey: string
}

export interface HiddenService {
  onionAddress: string
  privateKey: string
}

export interface PeerId {
  id: string
  pubKey?: string
  privKey?: string
}

export interface DmKeys {
  publicKey: string
  privateKey: string
}

export interface Identity {
  id: string
  nickname: string
  hiddenService: HiddenService
  dmKeys: DmKeys
  peerId: PeerId
  userCsr: UserCsr | null
  userCertificate: string | null
  joinTimestamp: number | null
}

export interface CreateUserCsrPayload {
  nickname: string
  commonName: string
  peerId: string
  dmPublicKey: string
  signAlg: string
  hashAlg: string
}

export interface RegisterCertificatePayload {
  communityId: string
  nickname: string
  userCsr: UserCsr
}

export interface RegisterUserCertificatePayload {
  communityId: string
  userCsr: string
  serviceAddress: string
}

export interface PermsData {
  certificate: string
  privKey: string
}

export interface RegisterOwnerCertificatePayload {
  communityId: string
  userCsr: UserCsr
  permsData: PermsData
}

export interface SaveCertificatePayload {
  certificate: string
  rootPermsData: PermsData
}

export interface SaveCSRPayload {
  // communityId: string
  csr: string
}

export interface SaveOwnerCertificatePayload {
  id: string
  peerId: string
  certificate: string
  permsData: PermsData
}

export interface SavedOwnerCertificatePayload {
  communityId: string
  network: { certificate: string; peers: string[] }
}

export interface SuccessfullRegistrarionResponse {
  communityId: string
  payload: UserCertificatePayload
}

export interface SendUserCertificatePayload {
  communityId: string
  payload: UserCertificatePayload
}

export interface SendOwnerCertificatePayload {
  communityId: string
  payload: OwnerCertificatePayload
}

export interface UserCertificatePayload {
  certificate: string
  peers: string[]
  rootCa: string
}

interface OwnerCertificatePayload extends UserCertificatePayload {
  ownerCert: string
}

export interface StoreUserCertificatePayload {
  userCertificate: string
  communityId: string
}

export interface UpdateJoinTimestampPayload {
  communityId: string
}
