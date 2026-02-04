# Admin Recovery

If all admins are removed or deactivated, you can recover access using the seed
script. It will create a new admin if none exists, or re-activate/promote an
existing user by email.

## Usage

```bash
node src/scripts/seedAdmin.js
```

### Custom email, password, and name

```bash
node src/scripts/seedAdmin.js --email admin@company.com --password "NewPass@123" --name "Admin"
```

### Notes

- Defaults: `admin@example.com` / `Admin@123` / `Admin`
- If a user with the given email exists, the script will:
  - Set `role` to `ADMIN`
  - Set `status` to `ACTIVE`
  - Update the password only if `--password` is provided
