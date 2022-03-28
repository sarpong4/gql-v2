const { ValidationError, AuthenticationError } = require("apollo-server");
const { defaultFieldResolver, GraphQLString } = require("graphql");
const { formatDate } = require("./utils");
const { mapSchema, MapperKind, getDirective } = require("@graphql-tools/utils");

// class FormatDateDirective extends SchemaDirectiveVisitor {
//   visitFieldDefinition(field) {
//     const resolver = field.resolve || defaultFieldResolver;

//     const { format } = this.args;
//     field.resolve = async (...args) => {
//       const result = await resolver.apply(this.args);
//       return formatDate(result, format);
//     };

//     field.type = GraphQLString;
//   }
// }

const dateFormatDirecitve = (schema, directiveName) => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const dateDirective = getDirective(
        schema,
        fieldConfig,
        directiveName
      )?.[0];

      if (dateDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;

        const { format: defaultFormat } = dateDirective;

        if (!fieldConfig.args) {
          throw new ValidationError("args should be defined");
        }

        fieldConfig.args["format"] = { type: GraphQLString };
        fieldConfig.type = GraphQLString;

        fieldConfig.resolve = async (
          source,
          { format, ...args },
          context,
          info
        ) => {
          const result = await resolve(source, args, context, info);
          return formatDate(result, format || defaultFormat);
        };
      }
    },
  });
};

const authenticationDirective = (schema, directiveName) => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const authenticationDirective = getDirective(
        schema,
        fieldConfig,
        directiveName
      )?.[0];

      if (authenticationDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;

        fieldConfig.resolve = async (root, args, ctx, info) => {
          if (!ctx.user) {
            throw new AuthenticationError("User not authenticated");
          }
          return resolve(root, args, ctx, info);
        };
      }
      return fieldConfig;
    },
  });
};
const authorizationDirective = (schema, directiveName) => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const authorizationDirective = getDirective(
        schema,
        fieldConfig,
        directiveName
      )?.[0];

      if (authorizationDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;

        const { role } = authorizationDirective;

        // fieldConfig.args["role"] = { type: GraphQLString };
        // fieldConfig.type = GraphQLString;

        fieldConfig.resolve = async (root, args, ctx, info) => {
          //   const userRole = role || defaultRole;
          if (ctx.user.role != role) {
            throw new AuthenticationError("User not authorized");
          }
          return resolve.apply(root, args, ctx, info);
        };
      }
      return fieldConfig;
    },
  });
};

module.exports = {
  dateFormatDirecitve,
  authenticationDirective,
  authorizationDirective,
};
