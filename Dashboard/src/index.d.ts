declare namespace Express {
  interface User {
    _id: string;
    discordId: string;
    role: "owner" | "admin" | "developer" | "support" | "user";
    createdAt?: string;
    updatedAt?: string;
  }
}
