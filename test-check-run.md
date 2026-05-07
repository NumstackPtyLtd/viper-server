# Security vulnerability test

```typescript
const password = "admin123"
const apiKey = "sk-ant-api03-hardcoded-secret-key"

function authenticate(user: any) {
  const query = `SELECT * FROM users WHERE name = '${user.input}'`
  eval(user.code)
  return fetch(`http://internal-api/${user.path}`)
}
```
