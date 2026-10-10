import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";

import { connectDB } from "./config/db.js";
import { typeDefs } from "./graphql/typeDefs.js";
import { resolvers } from "./graphql/resolvers.js";
import { getUserFromToken } from "./middleware/auth.js";

dotenv.config();

async function startServer() {
  await connectDB();

  const app = express();
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(
    "/graphql",
    cors({
      origin: process.env.CLIENT_URL,
      credentials: true,
    }),
    express.json({ limit: "100kb" }),
    expressMiddleware(server, {
      context: async ({ req }) => ({
        user: await getUserFromToken(req),
      }),
    }),
  );

  const port = process.env.PORT || 4000;

  app.listen(port, () => {
    console.log(`GraphQL API: http://localhost:${port}/graphql`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
