"use client";

import { useState } from "react";
import { createStaff, deleteStaff, updateStaff } from "@/actions/management";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit2, Search, Users, Eye, EyeOff } from "lucide-react";

import { toast } from "sonner";
import { User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExportButton } from "@/components/ui/ExportButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface StaffManagementViewProps {
  initialStaff: User[];
}

export function StaffManagementView({ initialStaff }: StaffManagementViewProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);


  const [formData, setFormData] = useState<{ username: string; password?: string; role: User['role'] }>({
    username: "",
    password: "",
    role: "DOCTOR"
  });


  const filteredStaff = initialStaff.filter(member =>
    member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ username: "", password: "", role: "DOCTOR" });
    setEditingId(null);
  };

  const handleOpenDialog = (member?: User) => {
    if (member) {
      setFormData({
        username: member.username,
        password: "", // Don't show password
        role: member.role
      });
      setEditingId(member.id as number);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    let result;
    if (editingId) {
      // For updates, only send password if it's not empty
      const updateData = { ...formData };
      if (!updateData.password) delete updateData.password;
      result = await updateStaff(editingId, updateData);
    } else {
      result = await createStaff(formData);
    }

    if (result.success) {
      toast.success(editingId ? "Cập nhật thông tin nhân sự thành công" : "Đã thêm tài khoản nhân sự mới thành công");
      setIsDialogOpen(false);
      resetForm();
      router.refresh();
    } else {
      toast.error(result.message || "Lưu tài khoản nhân sự thất bại");
    }
  };

  const handleDelete = async () => {
    if (memberToDelete === null) return;

    const result = await deleteStaff(memberToDelete);
    if (result.success) {
      toast.success("Đã xóa tài khoản nhân sự thành công");
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setIsDeleteConfirmOpen(false);
    setMemberToDelete(null);
  };

  const openDeleteConfirm = (id: number) => {
    setMemberToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            Quản lý nhân sự
          </h1>
          <p className="text-muted-foreground mt-1">Quản lý tài khoản của nhân viên bệnh viện và phân quyền truy cập hệ thống.</p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton url="http://localhost:8080/api/staff/export-performance" filename="staff_performance.xlsx" label="Xuất hiệu suất công việc" />
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger
              render={
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm nhân sự mới
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSave}>
                <DialogHeader>
                  <DialogTitle>{editingId ? "Chỉnh sửa thông tin nhân sự" : "Thêm nhân sự mới"}</DialogTitle>
                  <DialogDescription>
                    Cấu hình thông tin tài khoản đăng nhập và vai trò hệ thống.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="username">Tên đăng nhập</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="ví dụ: john_doe"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">
                      {editingId ? "Mật khẩu mới (Để trống nếu giữ nguyên)" : "Mật khẩu"}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        required={!editingId}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Vai trò hệ thống</Label>
                    <select
                      id="role"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as "ADMIN" | "DOCTOR" | "ENGINEER" })}
                    >
                      <option value="ADMIN">Quản trị viên</option>
                      <option value="DOCTOR">Bác sĩ</option>
                      <option value="ENGINEER">Kỹ sư</option>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {editingId ? "Cập nhật" : "Lưu tài khoản"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên đăng nhập hoặc vai trò..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Tên đăng nhập</TableHead>
              <TableHead>Vai trò hệ thống</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">
                  Không tìm thấy nhân viên nào.
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((member) => {
                const roleLabels: Record<string, string> = {
                  ADMIN: "Quản trị viên",
                  DOCTOR: "Bác sĩ",
                  ENGINEER: "Kỹ sư",
                };
                
                const getRoleStyles = (role: string) => {
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

                return (
                  <TableRow key={member.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold">{member.username}</TableCell>
                    <TableCell>
                      <Badge className={getRoleStyles(member.role)}>
                        {roleLabels[member.role] || member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(member)}>
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => member.id && openDeleteConfirm(member.id as number)}
                          className="hover:bg-rose-50 group"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500 group-hover:text-rose-600 transition-colors" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Xóa tài khoản nhân sự"
        description="Bạn có chắc chắn muốn xóa tài khoản nhân viên này không? Họ sẽ không thể đăng nhập vào hệ thống được nữa."
        confirmText="Xóa tài khoản"
        variant="destructive"
      />
    </div>
  );
}
