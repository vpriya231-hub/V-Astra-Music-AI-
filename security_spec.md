# Security Specification for Lyria Sonic Lab

## Data Invariants
1. A track must have a valid `userId` that matches the authenticated user's UID.
2. A track must have a non-empty `prompt` and `genre`.
3. `createdAt` must be a server-side timestamp.
4. `audioUrl` can be a blob URL or a permanent storage URL.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a track with `userId: "NOT_ME"`.
2. **Missing Auth**: Attempt to create a track while not signed in.
3. **Empty Prompt**: Attempt to create a track with an empty prompt string.
4. **Massive Payload**: Attempt to inject 1MB of junk data into the `lyrics` field.
5. **Unauthorized Deletion**: User A tries to delete User B's track.
6. **Unauthorized Update**: User A tries to change the `prompt` of User B's track.
7. **Bypassing Server Timestamp**: Trying to set `createdAt` manually to a past date.
8. **Invalid ID**: Using special characters or too long strings for document IDs.
9. **Spam List**: Attempting to list all tracks of all users without a filter.
10. **State Corruption**: Attempting to change the `userId` of an existing track.
11. **Malicious Genre**: Using a genre that is not in the allowed list (length check).
12. **PII Leak**: Accessing another user's private settings (if any were present).

## Proposed Rules
`firestore.rules` will enforce:
- `allow create`: If `isSignedIn()`, `isOwner(incoming().userId)`, and `isValidTrack(incoming())`.
- `allow read`: If `isSignedIn()` and `resource.data.userId == request.auth.uid` (for listing) OR `allow get` for sharing logic.
- `allow update, delete`: If `isOwner(existing().userId)`.
