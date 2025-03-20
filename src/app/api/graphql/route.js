import { createYoga, createSchema } from "graphql-yoga";
import { PrismaClient } from "@prisma/client";
import redis from "@/lib/redis"; // Hosted Redis server connection
import bcrypt from "bcryptjs"

const prisma = new PrismaClient();

const typeDefs = `

    enum Role {
    USER
    ADMIN
    }

    type Book {
        id : ID!
        title : String!
        author : Author!
        publishedAt : String!
        genre : String
    }

    type Author {
        id : ID!
        name : String!
        books : [Book!]!
    }

    type User {
        id : ID!
        username: String!
        password : String!
        email : String!
        role : Role!
        books : [Book!]!
    }

    type Query {
        books : [Book!]!
        book(id: ID!): Book
        authors : [Author!]!
        users: [User!]!
        user(id: ID!): User
    }

    type Mutation {
        addBook(title: String!, authorId: ID!, publishedAt: String!, genre: String): Book!
        deleteBook(id: ID!): Boolean!
        addUser(email: String!, username: String!, password : String!, role : Role): User!
        deleteUser(id:ID!): Boolean!
    }
`;

const resolvers = {
    Query: {
        books: async () => {
            const cachedBooks = await redis.get("books");
            if (cachedBooks) {
                console.log("From Redis Cache!");
                return JSON.parse(cachedBooks);
            }
            
            console.log("From Database!");
            const books = await prisma.book.findMany({ include: { author: true } });

            await redis.set("books", JSON.stringify(books), { EX: 120 }); // Fixed Redis syntax
            return books;
        },
        book: async (_, { id }) => {
            return prisma.book.findUnique({
                where: { id },
                include: { author: true },
            });
        },
        authors: async () => {
            return prisma.author.findMany({ include: { books: true } });
        },
    },
    Mutation: {
        addBook: async (_, { title, authorId, publishedAt, genre }) => {
            const newBook = await prisma.book.create({
                data: {
                    title,
                    authorId,
                    publishedAt: new Date(publishedAt).toISOString(), // Ensure correct format
                    genre,
                },
                include: { author: true },
            });

            await redis.del("books"); // Clear cache after adding book
            return newBook;
        },
        deleteBook: async (_, { id }) => {
            await prisma.book.delete({ where: { id } });
            await redis.del("books"); // Clear cache after deleting book
            return true;
        },
        addUser: async(_, {email, username, password, role})=>{
            const hashedPassword = await bcrypt.hash(password, 10)
            const newUser = await prisma.user.create({
                data : {email, username, password : hashedPassword, role: role || "USER"},
            });
            await redis.del('users');
            return  newUser;
        },
        deleteUser : async (_,{id})=>{
            await prisma.user.delete({
                where : {id}
            });
            await redis.del('users');
            return true;
        }
    },
};

// Corrected API Export
const yoga = createYoga({
    schema: createSchema({ typeDefs, resolvers }),
    graphqlEndpoint: "/api/graphql",
});

export { yoga as GET, yoga as POST };
