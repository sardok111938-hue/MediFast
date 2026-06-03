## Mobile Native Folder Decision

Customer app:

- `apps/customer-app/ios` is committed intentionally.
- Customer app is treated as prebuild/native for iOS.
- Do not delete `ios/` unless moving back to fully managed Expo after build verification.

Driver app:

- No `ios/` folder is committed.
- Driver app remains managed Expo for now.

Generated native artifacts remain ignored:

- `ios/build/`
- `ios/Pods/`
- `apps/*/ios/build/`
- `apps/*/ios/Pods/`