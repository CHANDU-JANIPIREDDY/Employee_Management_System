export function withJson(schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.password;
      delete ret.tokenVersion;
      delete ret.nameKey;
      return ret;
    },
  });
  return schema;
}
