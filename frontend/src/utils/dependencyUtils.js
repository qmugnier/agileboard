/**
 * Dependency management utilities for story validation and display
 */

/**
 * Check if a story can be transitioned to a final status
 * @param {Object} story - Story object
 * @param {Array} finalStatusNames - List of final status names
 * @param {Array} allStories - All stories in the project
 * @param {Object} userStoryAPI - API client for user stories
 * @returns {Promise<{canTransition: boolean, blockedBy: Array}>}
 */
export const checkCanCloseDependencies = async (story, finalStatusNames, allStories, userStoryAPI) => {
  try {
    // Only check if trying to close to a final status
    if (!finalStatusNames.includes(story.status)) {
      // Get stories blocked by this one
      const blockingRes = await userStoryAPI.getBlocking(story.story_id);
      const blockedBy = blockingRes.data || [];
      
      if (blockedBy.length > 0) {
        return {
          canTransition: false,
          blockedBy: blockedBy.map(s => s.story_id)
        };
      }
    }
    return { canTransition: true, blockedBy: [] };
  } catch (err) {
    // If API fails, allow transition (don't block on network error)
    return { canTransition: true, blockedBy: [] };
  }
};

/**
 * Get blocking info for a story
 * @param {string} storyId - Story ID
 * @param {Array} allStories - All stories
 * @param {Object} userStoryAPI - API client
 * @returns {Promise<{blockedBy: Array, blocking: Array}>}
 */
export const getStoryBlockingInfo = async (storyId, userStoryAPI) => {
  try {
    const [blockedRes, blockingRes] = await Promise.all([
      userStoryAPI.getBlockedBy(storyId).catch(() => ({ data: [] })),
      userStoryAPI.getBlocking(storyId).catch(() => ({ data: [] }))
    ]);
    
    return {
      blockedBy: (blockedRes.data || []).map(s => s.story_id),
      blocking: (blockingRes.data || []).map(s => s.story_id)
    };
  } catch (err) {
    return { blockedBy: [], blocking: [] };
  }
};

/**
 * Format dependency string for display
 */
export const formatDependencyLabel = (dependency, type) => {
  if (type === 'blocked-by') {
    return `⬇️ Blocked by ${dependency}`;
  } else if (type === 'blocking') {
    return `⬆️ Blocking ${dependency}`;
  }
  return dependency;
};
