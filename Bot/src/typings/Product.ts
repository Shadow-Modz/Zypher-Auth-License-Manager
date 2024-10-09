interface Product {
  name: string;
  description?: string;
  price: number;
  version: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
  role?: string;
}

export default Product;
