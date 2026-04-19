import { SupabaseClient } from '@supabase/supabase-js';

export async function staffHasPermission(
  supabase: SupabaseClient,
  staffId: string,
  permissionKey: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('staff_permissions')
    .select('id')
    .eq('staff_id', staffId)
    .eq('admin_permissions.key', permissionKey)
    .single();

  return !!data && !error;
}

export async function getStaffPermissions(
  supabase: SupabaseClient,
  staffId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('staff_permissions')
    .select('admin_permissions(key)')
    .eq('staff_id', staffId);

  return data?.map((p: any) => p.admin_permissions.key) || [];
}

export async function assignPermissionsByRole(
  supabase: SupabaseClient,
  staffId: string,
  role: string
) {
  const { data: rolePerms, error: roleError } = await supabase
    .from('staff_role_permissions')
    .select('permission_id')
    .eq('role', role);

  if (!rolePerms || roleError) return;

  const inserts = rolePerms.map((rp: any) => ({
    staff_id: staffId,
    permission_id: rp.permission_id,
  }));

  const { error } = await supabase
    .from('staff_permissions')
    .insert(inserts);

  if (error) {
    console.error('Error assigning permissions:', error);
  }
}

export async function revokePermission(
  supabase: SupabaseClient,
  staffId: string,
  permissionKey: string
) {
  const { data: permission } = await supabase
    .from('admin_permissions')
    .select('id')
    .eq('key', permissionKey)
    .single();

  if (!permission) return;

  const { error } = await supabase
    .from('staff_permissions')
    .delete()
    .eq('staff_id', staffId)
    .eq('permission_id', permission.id);

  if (error) {
    console.error('Error revoking permission:', error);
  }
}

export async function grantPermission(
  supabase: SupabaseClient,
  staffId: string,
  permissionKey: string,
  grantedBy?: string
) {
  const { data: permission } = await supabase
    .from('admin_permissions')
    .select('id')
    .eq('key', permissionKey)
    .single();

  if (!permission) return;

  const { error } = await supabase
    .from('staff_permissions')
    .insert({
      staff_id: staffId,
      permission_id: permission.id,
      granted_by: grantedBy,
    });

  if (error && !error.message.includes('duplicate')) {
    console.error('Error granting permission:', error);
  }
}
