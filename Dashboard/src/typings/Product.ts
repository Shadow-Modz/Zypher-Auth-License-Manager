interface Product {
  name: string;
  description?: string;
  price: number;
  version: string;
  role?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export default Product;
