import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign } from "hono/jwt";
import { signinInput, signupInput } from "@awptimizer/medium-common";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();

userRouter.post("/signup", async (c) => {
  const body = await c.req.json();
  const { success } = signupInput.safeParse(body);
  if (!success) {
    return c.json({ message: "Input not correct" }, 406);
  }

  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const userAlreadyExists = await prisma.user.findFirst({
      where: {
        username: body.username,
      },
    });

    if (userAlreadyExists) {
      return c.text("Username Exists");
    }

    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: body.password,
        name: body.name,
      },
    });

    const jwt = await sign(
      {
        id: user.id,
      },
      c.env.JWT_SECRET
    );

    return c.json({ jwt }, 200);
  } catch (error) {
    c.status(411);
    return c.text("Invalid Credentials");
  }
});

userRouter.post("/signin", async (c) => {
  const body = await c.req.json();
  const { success } = signinInput.safeParse(body);
  if (!success) {
    return c.json({ message: "Input not correct" }, 406);
  }
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const user = await prisma.user.findFirst({
      where: {
        username: body.username,
        password: body.password,
      },
    });

    if (!user) {
      c.status(403);
      return c.json({
        message: "Invalid credentials",
      });
    }

    const jwt = await sign(
      {
        id: user.id,
      },
      c.env.JWT_SECRET
    );

    return c.json({ jwt }, 200);
  } catch (error) {
    c.status(411);
    return c.text("Invalid Credentials");
  }
});
