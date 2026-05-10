import { RoleType } from "@prisma/client";

declare global {
  namespace Express {
    interface User {
      id: string;
      roles: RoleType[];
    }
  }
}

// Augment Request to make user non-optional, overriding @types/passport's optional declaration
import { Request as ExpressRequest } from "express";
declare module "express" {
  interface Request {
    user: Express.User;
  }
}
