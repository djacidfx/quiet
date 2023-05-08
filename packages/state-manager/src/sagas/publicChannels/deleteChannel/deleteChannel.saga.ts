import { publicChannelsActions } from '../publicChannels.slice'
import { PayloadAction } from '@reduxjs/toolkit'
import { SocketActionTypes } from '../../socket/const/actionTypes'

import { apply } from 'typed-redux-saga'

import { Socket, applyEmitParams } from '../../../types'

import logger from '../../../utils/logger'
const log = logger('publicChannels')

export function* deleteChannelSaga(
  socket: Socket,
  action: PayloadAction<ReturnType<typeof publicChannelsActions.createChannel>['payload']>
): Generator {
  log(`Deleting channel ${action.payload.channel.name}`)
  yield* apply(
    socket,
    socket.emit,
    applyEmitParams(SocketActionTypes.DELETE_CHANNEL, {
      channel: action.payload.channel
    })
  )
}