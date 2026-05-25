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

  const getRoleStyles = (role: User["role"]) => {
    switch (role) {
      case "DOCTOR":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200";
      case "ENGINEER":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200";
      case "ADMIN":
        return "bg-slate-800 text-slate-100 hover:bg-slate-700 border-slate-700";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200";
    }
  };

  const filterOptions: { label: string; value: RoleFilter }[] = [
    { label: "Tất cả", value: "ALL" },
    { label: "Bác sĩ", value: "DOCTOR" },
    { label: "Kỹ sư", value: "ENGINEER" },
  ];

  const roleLabels: Record<string, string> = {
    DOCTOR: "Bác sĩ",
    ENGINEER: "Kỹ sư",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kiếm tên tài khoản..."
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
            <TableHead>Tên đăng nhập</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                Không tìm thấy nhân viên nào phù hợp với bộ lọc.
              </TableCell>
            </TableRow>
          ) : (
            filteredUsers.map((user) => (
              <TableRow key={user.id ?? user.username}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>
                  <Badge className={getRoleStyles(user.role)}>
                    {roleLabels[user.role] || user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/users/${user.id}`}
                    className="inline-flex h-7 items-center justify-center rounded-lg border px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted"
                  >
                    Chi tiết
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
