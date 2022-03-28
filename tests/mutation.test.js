const gql = require("graphql-tag");
const createTestServer = require("./helper");
const CREATE_POST = gql`
  mutation {
    createPost(input: { message: "Test create Post" }) {
      message
    }
  }
`;

describe("mutations", () => {
  test("createPost", async () => {
    const { mutate } = createTestServer({
      user: { id: 1 },
      models: {
        Post: {
          createOne() {
            return { message: "Test create Post" };
          },
        },
        user: { id: 1 },
      },
    });

    const res = await mutate({ mutation: CREATE_POST });
    expect(res).toMatchSnapshot();
  });
});
