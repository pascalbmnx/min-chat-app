Create a **separate, secure and fully functional Admin Dashboard** for the existing Chat Web Application.

The dashboard must provide administrators with complete control over platform users, conversations, groups, messages, reports, notifications and system activity.

## Admin Dashboard UI

Create a premium modern admin interface with:

* Responsive dashboard layout
* Sidebar navigation
* Top navigation/header
* Dashboard overview cards
* Data tables
* Search and filtering
* Pagination
* Modal dialogs
* Confirmation dialogs
* Toast notifications
* Charts and analytics
* Dark/Light mode
* Smooth transitions and micro-animations
* SVG icons
* Mobile-responsive layout
* Loading, empty and error states

## Dashboard Overview

Display real-time statistics such as:

* Total users
* Active users
* Online users
* Total conversations
* Total groups
* Messages sent
* Unread reports
* Recent registrations
* Recent platform activity

Use actual database data, not dummy statistics.

## User Management

Allow administrators to:

* View all users
* Search users
* Filter users
* View user profiles
* View user activity
* Edit user information
* Change user roles
* Warn users
* Suspend users
* Block/unblock users
* Delete users
* View account status
* View last seen
* View registration date

Require confirmation for destructive actions.

## Conversation & Message Management

Allow authorized administrators to:

* View conversations
* View group conversations
* Search messages
* Review reported messages
* Remove violating messages
* Manage conversation-related reports
* View message metadata
* Monitor platform messaging activity

Respect privacy and access controls; only expose message content to administrators when the platform's moderation rules authorize it.

## Group Management

Allow administrators to:

* View all groups
* Search groups
* View group details
* View members
* Remove members when authorized
* Remove inappropriate groups
* Manage group reports
* View group activity

## Reports & Moderation

Create a dedicated moderation system where users can report:

* Users
* Messages
* Groups
* Profiles
* Other inappropriate content

Admin features:

* View reports
* Filter by status
* View report details
* Assign/handle reports
* Add moderation notes
* Resolve reports
* Reject reports
* Take appropriate moderation actions

## Notifications & Announcements

Allow administrators to:

* Create platform notifications
* Send announcements
* Target specific users or user groups
* Schedule notifications where supported
* View notification history
* Delete announcements
* Track notification status

Announcements should appear in the user application without unnecessarily interrupting normal conversations.

## Admin Roles & Permissions

Support multiple administrative roles such as:

* Super Admin
* Admin
* Moderator

Implement role-based permissions so each administrator can only access authorized sections and actions.

The Super Admin should be able to manage administrator accounts and permissions.

## Activity & Audit Logs

Record important administrative actions including:

* Login/logout
* User warnings
* User blocking
* User suspension
* User deletion
* Role changes
* Message moderation
* Group moderation
* Report resolution
* Admin account changes

Display logs with administrator, action, target, timestamp and relevant details.

## Security

Protect the admin dashboard with:

* Strong authentication
* Role-based authorization
* Secure sessions
* CSRF protection
* Input validation
* XSS protection
* SQL injection protection
* Secure file handling
* Rate limiting where appropriate
* Admin activity logging
* Protection against unauthorized API access

Never rely only on frontend permission checks. All admin permissions must also be enforced on the backend.

## Important

The Admin Dashboard must be **fully connected to the existing Chat Application database and APIs**.

Do not create fake data, mock statistics, placeholder buttons or demo functionality.

Every management action must perform the actual operation and update the application accordingly.

Keep the **Admin Dashboard completely separate from the normal user interface**, with its own authentication, navigation, permissions and management experience.

The final result should feel like a **professional production-grade messaging platform administration system**.
