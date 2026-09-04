// Reuse the Firebase login already owned by the metadata adapter; never persist tokens here.
export async function getMediaAnalysisAccessToken() {
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js');
  try {
    return (await getAuth().currentUser?.getIdToken()) || '';
  } catch (_error) {
    return '';
  }
}
