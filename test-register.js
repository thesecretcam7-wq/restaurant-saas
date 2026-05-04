// Script para testear el registro
const testData = {
  restaurantName: "La Prueba",
  ownerName: "Test User",
  email: "test-laprueba-2026@prueba.com",
  password: "Prueba123456"
};

console.log("📝 Enviando datos de registro:");
console.log(JSON.stringify(testData, null, 2));

// Simular el slug que se generaría
const slug = testData.restaurantName
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '');

console.log(`\n✅ Slug esperado: "${slug}"`);
console.log(`🔗 Dashboard esperado: /la-prueba/admin/dashboard`);

if (!slug || slug.length === 0) {
  console.log("❌ ERROR: Slug vacío!");
} else {
  console.log("✅ Slug válido");
}
