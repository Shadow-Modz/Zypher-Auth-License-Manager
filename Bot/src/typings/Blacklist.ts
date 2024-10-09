interface Blacklist {
  blacklisted: string;
  type: "ip" | "hwid";
  blocked_connections: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export default Blacklist;
