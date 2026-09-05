# delete-account — Edge Function

Fshin PLOTËSISHT llogarinë e një përdoruesi: të dhënat (bills, devices, users) **dhe** vetë llogarinë Auth (`auth.users`). Klienti nuk mund ta fshijë dot llogarinë Auth vetë (kërkon service-role), prandaj kjo bëhet këtu, në server.

## Si të bëhet deploy (një herë)

1. Instalo Supabase CLI dhe lidhu me projektin:
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref mibwoiofocgtteyxcezs
   ```
2. Deploy funksionin:
   ```bash
   supabase functions deploy delete-account
   ```
   `SUPABASE_URL` dhe `SUPABASE_SERVICE_ROLE_KEY` vendosen automatikisht nga Supabase.

## Si e thërret app-i

App-i (te `SettingsScreen.deleteAccountData`) e thërret me:
```js
await supabase.functions.invoke('delete-account');
```
Nëse funksioni nuk është ende i deploy-uar, app-i bie automatikisht te fshirja nga ana e klientit (fshin të dhënat + shkyçet), pra "Fshi të dhënat" punon gjithsesi — thjesht pa fshirë vetë llogarinë Auth derisa të bësh deploy këtë funksion.
