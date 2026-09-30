// ===============================================
// Router.js - Dynamic Module Loader
// ===============================================

export async function loadPageModule() {
 // Get the page identifier from the body tag
 const pageName = document.body.getAttribute('data-page');
 
 if (!pageName) return;
 
 try {
  // Dynamically import the module corresponding to the page
  // Fixed path: changed from ../modules/ to ./modules/
  const module = await import(`../modules/${pageName}.js`);
  
  // If the module has an init function, execute it
  if (module && typeof module.default === 'function') {
   module.default();
  } else if (module && typeof module.init === 'function') {
   module.init();
  }
 } catch (error) {
  console.warn(`No specific module found for page: ${pageName}`, error);
 }
}