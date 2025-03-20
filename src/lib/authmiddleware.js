import jwt from "jsonwebtoken";

export const authMiddleware = (resolver, requiredRole) => {
  return async (parent, args, context, info) => {
    const authHeader = context.req.headers.authorization;
    if (!authHeader) throw new Error("Unauthorized");

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (requiredRole && decoded.role !== requiredRole) {
      throw new Error("Forbidden: You do not have permission");
    }

    return resolver(parent, args, context, info);
  };
};
