// ===============================================
// Sidebar Component
// Collapse, Expand, Mobile Drawer
// ===============================================

import { $ } from "../utils/helpers.js";
import { storage } from "../utils/storage.js";

export function initSidebar() {
  const appContainer = $(".app-container");
  const sidebar = $("#sidebar");
  const collapseBtn = $("#collapse-btn");
  const mobileToggle = $("#mobile-menu-toggle");
  const overlay = $("#sidebar-overlay");

  if (!appContainer) return;

  const closeMobileDrawer = () => {
    appContainer.classList.remove("sidebar-open");
    if (overlay) overlay.classList.remove("active");
  };

  const applyCollapseState = (collapsed) => {
    if (collapsed) {
      appContainer.classList.add("sidebar-collapsed");
      if (sidebar) sidebar.classList.add("sidebar--collapsed");
    } else {
      appContainer.classList.remove("sidebar-collapsed");
      if (sidebar) sidebar.classList.remove("sidebar--collapsed");
    }
  };

  // Collapse/Expand Button (Desktop toggle or Mobile drawer close)
  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
      // If mobile drawer is open, clicking chevron closes drawer
      if (window.innerWidth <= 768) {
        closeMobileDrawer();
        return;
      }

      const willCollapse =
        !appContainer.classList.contains("sidebar-collapsed");
      applyCollapseState(willCollapse);
      storage.set("sidebar_collapsed", willCollapse);
    });

    // Restore state on desktop only
    if (window.innerWidth > 768 && storage.get("sidebar_collapsed")) {
      applyCollapseState(true);
    }
  }

  // Mobile Drawer Open
  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      appContainer.classList.add("sidebar-open");
      if (overlay) overlay.classList.add("active");
    });
  }

  // Mobile Drawer Close via Overlay
  if (overlay) {
    overlay.addEventListener("click", closeMobileDrawer);
  }

  // Close mobile drawer when clicking a navigation link on mobile
  const sidebarLinks = document.querySelectorAll(".sidebar__link");
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        closeMobileDrawer();
      }
    });
  });

  // Handle viewport resize transitions
  window.addEventListener("resize", () => {
    if (window.innerWidth <= 768) {
      // On mobile, ensure sidebar-collapsed is removed so drawer is full-width
      appContainer.classList.remove("sidebar-collapsed");
      if (sidebar) sidebar.classList.remove("sidebar--collapsed");
    } else {
      // On desktop, re-apply stored preference
      closeMobileDrawer();
      if (storage.get("sidebar_collapsed")) {
        applyCollapseState(true);
      }
    }
  });
}
