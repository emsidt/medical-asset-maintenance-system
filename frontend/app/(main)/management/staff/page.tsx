import { getStaff } from "@/actions/management";
import { StaffManagementView } from "@/components/features/StaffManagementView";

export default async function StaffManagementPage() {
  const staff = await getStaff();

  return <StaffManagementView initialStaff={staff} />;
}
