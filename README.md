# Vue 3 and Pinia Upgrade Guide

This guide explains the changes made to upgrade the browser-based game from Vue 2 to Vue 3 with Pinia state management.

## Overview of Changes

### 1. Dependency Upgrades
- Changed from Vue 2.6.14 to Vue 3.x
- Added Pinia 2.x for state management
- Updated Socket.IO client for compatibility

### 2. File Structure Changes
- Added `/static/js/store.js` for Pinia store
- Updated `/templates/vue-game.html` to use Vue 3 syntax
- Refactored `/static/js/vue-game.js` to use Vue 3 Composition API

## Key Concepts in the Upgrade

### Vue 3 Composition API

The main change is moving from Vue 2's Options API to Vue 3's Composition API:

- **Options API (Vue 2)**: Organized code by option types (data, methods, computed, etc.)
- **Composition API (Vue 3)**: Organizes code by logical concerns, using composables

### Pinia State Management

Pinia is the new official state management library for Vue, replacing Vuex:

- More intuitive API with less boilerplate
- Better TypeScript support
- Direct mutation of state is allowed (no mutations needed)
- Support for multiple stores

## Detailed Changes

### 1. HTML Template
- Updated script imports for Vue 3 and Pinia
- Moved template to `<script type="text/x-template">` for cleaner organization
- No changes to actual template structure

### 2. Pinia Store
- Created a centralized store for all game state
- Organized into state, getters, and actions
- State includes character data, location, map, UI state, etc.
- Actions handle all API calls and state updates

### 3. Vue Game Component
- Rewritten using Vue 3 Composition API with the `setup()` function
- Uses `onMounted()` instead of `created()`
- Uses `toRefs()` and `computed()` for reactivity
- Integrates with Pinia store using composable `useGameStore()`

## How to Use the New Structure

### Accessing State
```javascript
// In the component
const store = useGameStore();

// Access state directly
console.log(store.character);

// With computed properties for reactivity
const health = Vue.computed(() => store.character.health);
```

### Updating State
```javascript
// Direct mutation (supported in Pinia)
store.character.health = 90;

// Using an action
store.updateCharacter(newCharacterData);
```

### Using Socket.IO
The Socket.IO integration remains similar but now updates the Pinia store:

```javascript
socket.on('character_update', (data) => {
    store.updateCharacter(data);
});
```

## Benefits of the Upgrade

1. **Better Performance**: Vue 3's reactivity system is more efficient
2. **Better Developer Experience**: Composition API allows for more reusable code
3. **Improved State Management**: Pinia is simpler and more intuitive than Vuex
4. **Future-Proofing**: Vue 3 is the current stable version with ongoing support

## Testing After Upgrade

After implementing these changes, you should test:

1. User authentication (login/signup)
2. Character data loading and display
3. Map navigation
4. Action execution
5. WebSocket real-time updates
6. Modal and toast notifications

Make sure to test both the WebSocket path and the fallback REST API path.
