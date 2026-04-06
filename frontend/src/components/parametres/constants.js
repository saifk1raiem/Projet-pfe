import { appConfig } from "../../lib/config";

export const defaultFormValues = {
  entreprise: appConfig.companyName,
  emailAdmin: appConfig.adminEmail,
  fuseau: appConfig.defaultTimezone,
  notifEmail: true,
  notifRappels: false,
  doubleAuth: false,
};

export const defaultCreateUserForm = {
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  password: "",
  role: "observer",
  is_active: true,
};
