import { gql } from "@apollo/client";

export const GET_ME = gql`
  query Me {
    me {
      id
      name
      email
      role
      isActive
    }
  }
`;

export const GET_USERS = gql`
  query GetUsers {
    getUsers {
      id
      name
      email
      role
      isActive
      createdAt
    }
  }
`;

export const GET_USER = gql`
  query GetUser($id: ID!) {
    getUser(id: $id) {
      id
      name
      email
      role
      isActive
    }
  }
`;
