import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const isStandaloneRag =
      process.env.RAG_CHAT_MOCK === "true" ||
      Boolean(process.env.RAG_DIRECT_BASE_URL && process.env.RAG_DIRECT_TOKEN);
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const role = token?.role || (isStandaloneRag ? "ADMIN" : undefined);

    if (path.startsWith("/management/staff") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/management") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) =>
        process.env.RAG_CHAT_MOCK === "true" ||
        Boolean(process.env.RAG_DIRECT_BASE_URL && process.env.RAG_DIRECT_TOKEN) ||
        !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
