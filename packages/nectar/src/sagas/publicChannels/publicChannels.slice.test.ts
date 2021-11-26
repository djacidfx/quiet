import { combineReducers, createStore, Store } from 'redux';
import { StoreKeys } from '../store.keys';
import { publicChannelsSelectors } from './publicChannels.selectors';
import {
  publicChannelsActions,
  publicChannelsReducer,
  CommunityChannels,
  PublicChannelsState,
} from './publicChannels.slice';

import { channelsByCommunityAdapter } from './publicChannels.adapter';
import {
  communitiesReducer,
  CommunitiesState,
  Community,
} from '../communities/communities.slice';

import { communitiesAdapter } from '../communities/communities.adapter';

const mockGetPublicChannels = {
  public: {
    address:
      'zs1ppz4qxctnv85ycex7u4cyxatz2wnduzy7usvyagma6h45lwrx88pdl3mdu25z763uvfy7a0qpfs',
    description: 'public chat',
    name: 'public',
    owner: '030fdc016427a6e41ca8dccaf0c09cfbf002e5916a13ee16f5fe7240d0dfe50ede',
    timestamp: 1587010998,
  },
  zbay: {
    address:
      'zs10zkaj29rcev9qd5xeuzck4ly5q64kzf6m6h9nfajwcvm8m2vnjmvtqgr0mzfjywswwkwke68t00',
    description: 'zbay marketplace channel',
    name: 'zbay',
    owner: '030fdc016427a6e41ca8dccaf0c09cfbf002e5916a13ee16f5fe7240d0dfe50ede',
    timestamp: 1587009699,
  },
};

describe('publicChannelsReducer', () => {
  let store: Store;

  const communityId = new Community({
    name: 'communityId',
    id: 'communityId',
    CA: { rootCertString: 'certString', rootKeyString: 'keyString' },
    registrarUrl: '',
  });

  let communityChannels = new CommunityChannels('communityId');

  communityChannels.currentChannel = 'currentChannel';

  communityChannels.channelMessages = {
    currentChannel: {
      ids: ['1', '0', '2', '4'],
      messages: {
        '0': {
          id: '0',
          message: 'message0',
          createdAt: 0,
          channelId: '',
          signature: '',
          pubKey: '12',
          type: 1,
        },
        '2': {
          id: '2',
          message: 'message2',
          createdAt: 0,
          channelId: '',
          signature: '',
          pubKey: '12',
          type: 1,
        },
        '4': {
          id: '4',
          message: 'message4',
          createdAt: 0,
          channelId: '',
          signature: '',
          pubKey: '12',
          type: 1,
        },
        '1': {
          id: '1',
          message: 'message1',
          createdAt: 0,
          channelId: '',
          signature: '',
          pubKey: '12',
          type: 1,
        },
      },
    },
  };

  beforeEach(() => {
    store = createStore(
      combineReducers({
        [StoreKeys.PublicChannels]: publicChannelsReducer,
        [StoreKeys.Communities]: communitiesReducer,
      }),
      {
        [StoreKeys.PublicChannels]: {
          ...new PublicChannelsState(),
          channels: channelsByCommunityAdapter.setAll(
            channelsByCommunityAdapter.getInitialState(),
            [communityChannels]
          ),
        },
        [StoreKeys.Communities]: {
          ...new CommunitiesState(),
          currentCommunity: 'communityId',
          communities: communitiesAdapter.setAll(
            communitiesAdapter.getInitialState(),
            [communityId]
          ),
        },
      }
    );
  });

  it('responseGetPublicChannels should set channels info', () => {
    store.dispatch(
      publicChannelsActions.responseGetPublicChannels({
        communityId: 'communityId',
        channels: mockGetPublicChannels,
      })
    );
    const channels = publicChannelsSelectors.publicChannels(store.getState());
    expect(channels).toMatchInlineSnapshot(`
Array [
  Object {
    "address": "zs1ppz4qxctnv85ycex7u4cyxatz2wnduzy7usvyagma6h45lwrx88pdl3mdu25z763uvfy7a0qpfs",
    "description": "public chat",
    "name": "public",
    "owner": "030fdc016427a6e41ca8dccaf0c09cfbf002e5916a13ee16f5fe7240d0dfe50ede",
    "timestamp": 1587010998,
  },
  Object {
    "address": "zs10zkaj29rcev9qd5xeuzck4ly5q64kzf6m6h9nfajwcvm8m2vnjmvtqgr0mzfjywswwkwke68t00",
    "description": "zbay marketplace channel",
    "name": "zbay",
    "owner": "030fdc016427a6e41ca8dccaf0c09cfbf002e5916a13ee16f5fe7240d0dfe50ede",
    "timestamp": 1587009699,
  },
]
`);
  });
});
