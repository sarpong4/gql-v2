const gql = require("graphql-tag");
const createTestServer = require("./helper");
const CREATE_POST = gql`
  mutation {
    createPost(input: { message: "Test create Post" }) {
      message
    }
  }
`;

const { Query } = require("../src/resolvers");

describe("resolvers", () => {
  test("feed", async () => {
    const result = Query.feed(null, null, {
      models: {
        Post: {
          findMany() {
            return ["test resolvers"];
          },
        },
      },
    });

    expect(result).toEqual(["test resolvers"]);
  });
});
