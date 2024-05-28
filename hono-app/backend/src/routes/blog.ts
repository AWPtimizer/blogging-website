import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import { createBlogInput, updateBlogInput } from "@awptimizer/medium-common";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  },
  Variables: {
    userId: string;
  }
}>();

blogRouter.use("/*", async (c, next) => {
  // this is basically extracting the user id
  // passing it down to the route handler
  const authHeader = c.req.header("authorization") || "";

  try {
    const user = await verify(authHeader, c.env.JWT_SECRET);
  if (user) {
    c.set("userId", String(user.id));
    await next();
  } else {
    return c.json({ message: "You are not logged in!" }, 401);
  }
  } catch (error) {
    return c.json({message: `You are not logged in!`}, 404)
  }
  
});

blogRouter.post("/", async (c) => {
  const body = await c.req.json();
  const {success} = createBlogInput.safeParse(body);
  if (!success) {
    return c.json({message: "Input not correct"}, 406)
  }
  const authorId = c.get("userId")
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.blog.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: Number(authorId),
    },
  });
  return c.json(
    {
      id: blog.id,
    },
    200
  );
});

blogRouter.put("/", async (c) => {
  const body = await c.req.json();
  const {success} = updateBlogInput.safeParse(body);
  if (!success) {
    return c.json({message: "Input not correct"}, 406)
  }
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.blog.update({
    where: {
      id: body.id,
    },
    data: {
      title: body.title,
      content: body.content,
    },
  });
  return c.json(
    {
      id: blog.id,
    },
    200
  );
});

// Todo: Add Pagination
blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blogs = await prisma.blog.findMany({});
  return c.json({ blogs }, 200);
});

blogRouter.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blog = await prisma.blog.findUnique({
      where: {
        id,
      },
    });

    return c.json({ blog }, 200);
  } catch (error) {
    c.status(404);
    return c.json({
      message: `Error in blogRouter get /:id method: ${error}`,
    });
  }
});
