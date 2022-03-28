const { authenticated, authorized } = require("./auth");
const { PubSub } = require("graphql-subscriptions");
const { AuthenticationError } = require("apollo-server-core");

const pubsub = new PubSub();
const NEW_POST = "NEW_POST";

/**
 * Anything Query / Mutation resolver
 * using a user for a DB query
 * requires user authenication
 */
module.exports = {
  Query: {
    me: authenticated((_, __, { user }) => {
      return user;
    }),
    posts: authenticated((_, __, { user, models }) => {
      return models.Post.findMany({ author: user.id });
    }),

    post: authenticated((_, { id }, { user, models }) => {
      return models.Post.findOne({ id, author: user.id });
    }),

    userSettings: authenticated((_, __, { user, models }) => {
      return models.Settings.findOne({ user: user.id });
    }),
    // public resolver
    feed(_, __, { models }) {
      return models.Post.findMany();
    },
  },
  Mutation: {
    updateSettings: authenticated((_, { input }, { user, models }) => {
      return models.Settings.updateOne({ user: user.id }, input);
    }),

    createPost: authenticated((_, { input }, { user, models }) => {
      const post = models.Post.createOne({
        ...input,
        author: user.id,
        likes: 0,
        views: 0,
      });
      pubsub.publish(NEW_POST, { createPost: post });
      return post;
    }),

    updateMe: authenticated((_, { input }, { user, models }) => {
      return models.User.updateOne({ id: user.id }, input);
    }),
    // admin role
    invite: authenticated(
      authorized("ADMIN", (_, { input }, { user }) => {
        return {
          from: user.id,
          role: input.role,
          createdAt: Date.now(),
          email: input.email,
        };
      })
    ),

    signup(_, { input }, { models, createToken }) {
      const existing = models.User.findOne({ email: input.email });

      if (existing) {
        throw new AuthenticationError("Existing account...");
      }
      const user = models.User.createOne({
        ...input,
        verified: false,
        avatar: "http",
      });
      const token = createToken(user);
      return { token, user };
    },
    signin(_, { input }, { models, createToken }) {
      const user = models.User.findOne(input);

      if (!user) {
        throw new AuthenticationError("nope");
      }

      const token = createToken(user);
      return { token, user };
    },
  },
  User: {
    posts: authenticated((root, _, { user, models }) => {
      if (root.id !== user.id) {
        throw new AuthenticationError("nope");
      }

      return models.Post.findMany({ author: root.id });
    }),
    settings: authenticated((root, __, { user, models }) => {
      return models.Settings.findOne({ id: root.settings, user: user.id });
    }),
  },
  Subscription: {
    createPost: {
      subscribe: () => pubsub.asyncIterator([NEW_POST]),
    },
  },
  Settings: {
    user: authenticated((settings, _, { user, models }) => {
      return models.Settings.findOne({ id: settings.id, user: user.id });
    }),
  },
  Post: {
    author(post, _, { models }) {
      return models.User.findOne({ id: post.author });
    },
  },
};
