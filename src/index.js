const { ApolloServer } = require("apollo-server-express");
const typeDefs = require("./typedefs");
const resolvers = require("./resolvers");
const { createToken, getUserFromToken } = require("./auth");
const db = require("./db");
const { createServer } = require("http");
const { ApolloServerPluginDrainHttpServer } = require("apollo-server-core");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/lib/use/ws");
const express = require("express");

const startServer = async () => {
  const app = express();
  const httpServer = createServer(app);

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/gql",
  });

  const serverCleanup = useServer(
    {
      schema,
      // context: (ctx, msg, args) => {
      //   if (ctx.connectionInitReceived) {
      //     return { ...ctx };
      //   }
      // },
      // onConnect: async (ctx) => {
      //   const token = ctx.connectionParams.authentication;
      //   const user = getUserFromToken(token);
      //   console.log(`Token: ${token}`);
      //   return { user };
      // },
      // onDisconnect(ctx, code, reason) {
      //   console.log("Disconnected!");
      // },
    },
    wsServer
  );

  const server = new ApolloServer({
    schema,
    context({ req, connection }) {
      const context = { ...db };
      if (connection) {
        console.log(context);
        return { ...context, ...connection.context };
      }
      const token = req.headers.authorization;
      const user = getUserFromToken(token);
      return { ...context, user, createToken };
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
    subscription: {
      onConnect(params) {
        const token = params.authToken;
        const user = getUserFromToken(token);
        if (!user) {
          throw new Error("nope");
        }
        console.log("On connect...");
        return { user };
      },
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: "/" });

  const port = 4000;
  httpServer.listen(port, () => {
    console.log(
      `🚀 Server ready at http://localhost:${port}${server.graphqlPath}`
    );
  });
};

startServer();
