"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { User } from "@/types";

type RoleFilter = "ALL" | "DOCTOR" | "ENGINEER";

interface UserListTableProps {
  users: User[];
}

export function UserListTable({ users }: UserListTableProps) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const isStaffRole = user.role === "DOCTOR" || user.role === "ENGINEER";
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesQuery = user.username.toLowerCase().includes(normalizedQuery);

      return isStaffRole && matchesRole && matchesQuery;
    });
  }, [query, roleFilter, users]);

  const getRoleVariant = (role: User["role"]): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case "DOCTOR":
        return "secondary";
      case "ENGINEER":
        return "outline";
      default:
        return "default";
    }
  };

  const filterOptions: { label: string; value: RoleFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Doctor", value: "DOCTOR" },
    { label: "Engineer", value: "ENGINEER" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search username"
            className="pl-8"
          />
        </div>

        <div className="inline-flex w-fit rounded-lg border bg-background p-1">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRoleFilter(option.value)}
              className={cn(
                "h-7 rounded-md px-3",
                roleFilter === option.value && "bg-muted text-foreground"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Tag</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                No users match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            filteredUsers.map((user) => (
              <TableRow key={user.id ?? user.username}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>
                  <Badge variant={getRoleVariant(user.role)}>
                    {user.role.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/users/${user.id}`}
                    className="inline-flex h-7 items-center justify-center rounded-lg border px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
