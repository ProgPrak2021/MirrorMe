import JSZip from 'jszip';
import jetpack from 'fs-jetpack';
import { readString } from 'react-papaparse';
import { DATA_DIR, SUPPORTED_FILE_TYPES } from '../../globals';
import {
  CompanyRelevantData,
  InstagramRelevantData,
  RedditRelevantData,
} from '../../types';
import {
  decodeString,
  getValueFromObjectArray,
  getValuesFromObject,
  populateJsonArray,
} from './jsonUtils';

const relevantFields = {
  REDDIT: {
    GENDER: 'account_gender.csv',
    IP_LOGS: 'ip_logs.csv',
    COMMENTS: 'comments.csv',
    POSTS: 'posts.csv',
    VOTES: 'post_votes.csv',
    MESSAGES: 'messages.csv',
    SUBREDDITS: 'subscribed_subreddits.csv',
  },
  INSTAGRAM: {
    COMMENTS: 'post_comments.json',
    MESSAGES: 'message_1.json',
    POSTS: 'posts_1.json',
    LIKES: 'liked_posts.json',
    FOLLOWERS: 'followers.json',
    FOLLOWINGS: 'following.json',
    ADS_INTERESTS: 'ads_interests.json',
    YOUR_TOPICS: 'your_topics.json',
    STORIES: 'stories.json',
  },
};

export const saveTextToFile = (name: string, content: string) => {
  jetpack.dir(DATA_DIR);
  jetpack.file(DATA_DIR + name, { content });
};

export const processCompany = async (
  relevantJSON: CompanyRelevantData,
  companySwitch: (
    json: CompanyRelevantData,
    data: unknown[],
    path: string
  ) => void,
  acceptedFiles: Array<File>,
  isJSON: boolean
): Promise<CompanyRelevantData> => {
  const promises = { promises: [] as Promise<string>[], paths: [] as string[] };

  const zip = new JSZip();
  await zip
    .loadAsync(acceptedFiles[0])
    .then(
      (zipped) => {
        zipped.forEach(async (relativePath, file) => {
          if (!file.dir) {
            const type = relativePath.substr(relativePath.lastIndexOf('.'));
            if (SUPPORTED_FILE_TYPES.includes(type)) {
              promises.promises.push(file.async('text'));
              promises.paths.push(
                relativePath.substr(relativePath.lastIndexOf('/') + 1)
              );
            }
          }
        });

        return null;
      },
      () => {
        throw new Error('Invalid format');
      }
    )
    .catch((err) => console.log(err));

  await Promise.all(promises.promises).then((values) => {
    for (let i = 0; i < values.length; i += 1) {
      let jsonData: any;
      if (isJSON) {
        jsonData = JSON.parse(values[i]);
      } else {
        jsonData = readString(values[i], { header: true }).data;
      }
      companySwitch(relevantJSON, jsonData, promises.paths[i]);
    }

    return null;
  });

  return relevantJSON;
};

export const processReddit = async (
  acceptedFiles: Array<File>
): Promise<RedditRelevantData> => {
  const relevantJSON: RedditRelevantData = {
    gender: '',
    ipLogs: [],
    contributions: {
      comments: [],
      votes: [],
      posts: [],
      messages: [],
    },
    subreddits: 0,
  };

  return processCompany(
    relevantJSON,
    (json, jsonData, path) => {
      const relevantJSON = { ...json } as RedditRelevantData;
      const { comments, messages, posts } = relevantJSON.contributions;
      switch (path) {
        case relevantFields.REDDIT.GENDER: {
          const values = getValuesFromObject(jsonData[0], ['account_gender']);
          [relevantJSON.gender] = values;
          break;
        }
        case relevantFields.REDDIT.IP_LOGS: {
          populateJsonArray(relevantJSON.ipLogs, jsonData, ['date', 'ip']);
          break;
        }
        case relevantFields.REDDIT.COMMENTS: {
          populateJsonArray(comments, jsonData, ['date', 'subreddit']);
          break;
        }
        case relevantFields.REDDIT.VOTES: {
          jsonData.forEach((object) => {
            const values = getValuesFromObject(object, [
              'permalink',
              'direction',
            ]);

            if (values.length > 0 && values[1] !== 'none') {
              const start = values[0].indexOf('/r/') + 3;
              const end = values[0].indexOf('/', start);
              relevantJSON.contributions.votes.push({
                subreddit: values[0].substring(start, end),
                direction: values[1] === 'up',
              });
            }
          });
          break;
        }
        case relevantFields.REDDIT.POSTS: {
          populateJsonArray(posts, jsonData, ['date', 'subreddit']);
          break;
        }
        case relevantFields.REDDIT.MESSAGES: {
          populateJsonArray(messages, jsonData, ['date', 'from']);
          break;
        }
        case relevantFields.REDDIT.SUBREDDITS:
          relevantJSON.subreddits = jsonData.length;
          break;
        default:
          break;
      }
      json = { ...relevantJSON };
    },
    acceptedFiles,
    false
  ) as Promise<RedditRelevantData>;
};

export const processInstagram = async (
  acceptedFiles: Array<File>
): Promise<InstagramRelevantData> => {
  const relevantJSON: InstagramRelevantData = {
    contributions: {
      comments: [],
      messages: [],
      posts: [],
      likes: [],
      stories: [],
    },
    relationships: {
      followers: [],
      followings: [],
    },
    interests: {
      ads: [],
      topics: [],
    },
  };

  return processCompany(
    relevantJSON,
    (json, jsonData, path) => {
      const relevantJSON = { ...json } as InstagramRelevantData;
      switch (path) {
        case relevantFields.INSTAGRAM.COMMENTS: {
          const comments = getValueFromObjectArray(
            jsonData,
            'comments_media_comments',
            ['string_list_data']
          );

          relevantJSON.contributions.comments = comments.map((comment) => {
            return new Date(
              getValuesFromObject(comment[0], ['timestamp'])[0] * 1000
            );
          });

          break;
        }
        case relevantFields.INSTAGRAM.MESSAGES: {
          const messages: any[] = [];
          const values = getValuesFromObject(jsonData, [
            'participants',
            'messages',
          ]);

          if (values[0].length <= 2) {
            const participant = decodeString(
              getValuesFromObject(values[0][0], ['name'])[0]
            );

            (values[1] as any[]).forEach((message) => {
              const content = getValuesFromObject(message, [
                'sender_name',
                'timestamp_ms',
              ]);

              if (participant !== content[0]) {
                messages.push({
                  participant,
                  date: new Date(content[1]),
                });
              }
            });
          }

          relevantJSON.contributions.messages = [
            ...relevantJSON.contributions.messages,
            ...messages,
          ];
          break;
        }
        case relevantFields.INSTAGRAM.POSTS: {
          relevantJSON.contributions.posts = jsonData.map((post) => {
            const content = getValuesFromObject(post, ['media'])[0];
            return new Date(
              getValuesFromObject(content[0], ['creation_timestamp'])[0] * 1000
            );
          });
          break;
        }
        case relevantFields.INSTAGRAM.LIKES: {
          const likes = getValueFromObjectArray(jsonData, 'likes_media_likes', [
            'string_list_data',
          ]);

          relevantJSON.contributions.likes = likes.map((like) => {
            return new Date(
              getValuesFromObject(like[0], ['timestamp'])[0] * 1000
            );
          });

          break;
        }
        case relevantFields.INSTAGRAM.FOLLOWERS: {
          const followers = getValueFromObjectArray(
            jsonData,
            'relationships_followers',
            ['string_list_data']
          );

          relevantJSON.relationships.followers = followers.map((follower) => {
            return getValuesFromObject(follower[0], ['value'])[0];
          });

          break;
        }
        case relevantFields.INSTAGRAM.FOLLOWINGS: {
          const followings = getValueFromObjectArray(
            jsonData,
            'relationships_following',
            ['string_list_data']
          );

          relevantJSON.relationships.followings = followings.map((follow) => {
            return getValuesFromObject(follow[0], ['value'])[0];
          });

          break;
        }
        case relevantFields.INSTAGRAM.ADS_INTERESTS: {
          const ads = getValueFromObjectArray(
            jsonData,
            'inferred_data_ig_interest',
            ['string_map_data']
          );

          relevantJSON.interests.ads = ads.map((ad) => {
            const interest = getValuesFromObject(ad, ['Interest'])[0];
            console.log(interest);
            return getValuesFromObject(interest, ['value'])[0];
          });

          break;
        }
        case relevantFields.INSTAGRAM.YOUR_TOPICS: {
          const topics = getValueFromObjectArray(
            jsonData,
            'topics_your_topics',
            ['string_map_data']
          );

          relevantJSON.interests.topics = topics.map((topic) => {
            const name = getValuesFromObject(topic, ['Name'])[0];
            return getValuesFromObject(name, ['value'])[0];
          });

          break;
        }
        case relevantFields.INSTAGRAM.STORIES: {
          const stories = getValueFromObjectArray(jsonData, 'ig_stories', [
            'creation_timestamp',
          ]);

          relevantJSON.contributions.stories = stories.map((story) => {
            return new Date(story * 1000);
          });

          break;
        }
        default: {
          break;
        }
      }
      json = { ...relevantJSON };
    },
    acceptedFiles,
    true
  ) as Promise<InstagramRelevantData>;
};

export default '';
