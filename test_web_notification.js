// Test Web Notification Display
// Run this in browser console to test if notifications work

async function testWebNotification() {
    console.log("=== Testing Web Notification ===");

    // Check if Notification API is supported
    if (!("Notification" in window)) {
        console.error("❌ This browser does not support notifications");
        return;
    }

    console.log("✅ Notification API is supported");
    console.log("Current permission:", Notification.permission);

    // Request permission if needed
    if (Notification.permission !== "granted") {
        console.log("Requesting permission...");
        const permission = await Notification.requestPermission();
        console.log("Permission result:", permission);

        if (permission !== "granted") {
            console.error("❌ Permission denied");
            return;
        }
    }

    console.log("✅ Permission granted");

    // Try to create a simple notification
    try {
        console.log("Creating test notification...");
        const notification = new Notification("Test Notification", {
            body: "If you see this, notifications are working!",
            tag: "test"
        });

        console.log("✅ Notification created:", notification);

        notification.onclick = () => {
            console.log("Notification clicked!");
            window.focus();
        };

        notification.onerror = (error) => {
            console.error("❌ Notification error:", error);
        };

        notification.onshow = () => {
            console.log("✅ Notification is now showing on screen");
        };

        notification.onclose = () => {
            console.log("Notification closed");
        };

    } catch (error) {
        console.error("❌ Error creating notification:", error);
    }
}

// Run the test
testWebNotification();

console.log("\n=== Additional Checks ===");
console.log("Document visibility:", document.visibilityState);
console.log("Document has focus:", document.hasFocus());
console.log("Browser:", navigator.userAgent);
