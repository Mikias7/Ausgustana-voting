import { Info, LogOut, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSignOut } from "../../hooks/useSignOut";
import { canAccessAdmin } from "../../utils/auth";
import { fullName } from "../../utils/text";
import { GroupedList } from "../ui/GroupedList";
import { ListRow } from "../ui/ListRow";
import { Modal } from "../ui/Modal";

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
}

const icon = "size-5";

/** Bottom sheet behind the tab bar's "More": About, Contact, Admin, Sign out. */
export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const { user } = useAuth();
  const signOut = useSignOut();

  return (
    <Modal
      open={open}
      onClose={onClose}
      placement="sheet"
      title="More"
      description={user ? `Signed in as ${fullName(user)}` : undefined}
    >
      <div className="space-y-4">
        <GroupedList label="More pages">
          <ListRow to="/about" title="About" leading={<Info className={icon} aria-hidden="true" />} />
          <ListRow to="/contact" title="Contact ASA" leading={<Mail className={icon} aria-hidden="true" />} />
          {canAccessAdmin(user) && (
            <ListRow to="/admin" title="Admin" leading={<ShieldCheck className={icon} aria-hidden="true" />} />
          )}
        </GroupedList>
        {user && (
          <GroupedList label="Account">
            <ListRow
              title="Sign out"
              chevron={false}
              onClick={() => {
                onClose();
                void signOut();
              }}
              leading={<LogOut className={icon} aria-hidden="true" />}
            />
          </GroupedList>
        )}
      </div>
    </Modal>
  );
}
