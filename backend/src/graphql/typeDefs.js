import { gql } from "graphql-tag";

export const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
    profileImageUrl: String
  }

  type AuthPayload {
    user: User!
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
  }

  input CreateUserInput {
    name: String!
    email: String!
    password: String!
    role: String
  }

  input UpdateUserInput {
    name: String
    email: String
    role: String
    isActive: Boolean
  }

  input UpdateProfileInput {
    name: String
    email: String
  }

  type Query {
    me: User!
    getUsers: [User!]!
    getUser(id: ID!): User!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!

    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!

    updateProfile(input: UpdateProfileInput!): User!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!
  }
`;
