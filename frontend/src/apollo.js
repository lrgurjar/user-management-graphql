import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";

const httpLink = new HttpLink({
  uri: "http://localhost:4000/graphql",
});

const authLink = new SetContextLink((prevContext, operation) => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      ...prevContext.headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

export const client = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]),
  cache: new InMemoryCache(),
});
