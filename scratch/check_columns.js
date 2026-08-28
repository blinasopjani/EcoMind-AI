async function check() {
  const url = 'https://mibwoiofocgtteyxcezs.supabase.co';
  const anonKey = 'sb_publishable_PHXNYPAwoblop48bZ6IANg_w32xh1YB';
  
  const email = `test_usr_${Date.now()}@ecomind.app`;
  const password = 'Password123!';
  
  console.log('Signing up...');
  const signUpRes = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey
    },
    body: JSON.stringify({ email, password })
  });
  
  const signUpData = await signUpRes.json();
  const userId = signUpData.id || signUpData.user.id;
  const token = signUpData.access_token;
  console.log('Signed up user:', userId);
  
  console.log('Fetching user columns...');
  const fetchRes = await fetch(`${url}/rest/v1/users?id=eq.${userId}`, {
    method: 'GET',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${token}`
    }
  });
  
  const fetchData = await fetchRes.json();
  console.log('Fetch Response:', fetchData);
  if (fetchData && fetchData.length > 0) {
    console.log('User Columns:', Object.keys(fetchData[0]));
  }
}

check();
