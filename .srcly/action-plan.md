# Srcly Action Plan

Profile: `general`

## Suggested Work Queue

1. Complexity hotspot in parseMarkdownHeadingSections
   Evidence: `/Users/byronwall/Projects/comic-books/app/src/lib/projects/context-node-markdown.ts::parseMarkdownHeadingSections:41-147`; complexity=24, loc=107, max_nesting_depth=5, parameter_count=2; priority=medium; path_priority=neutral.
   Safe first patch: Trace the control flow and identify behavior-preserving simplification points.
   Verify: inspect nearby tests first, then run the narrowest type-check or test command for the touched package.

2. Large node worth responsibility review in comic-creator.css
   Evidence: `/Users/byronwall/Projects/comic-books/app/src/components/comics/comic-creator.css`; loc=1259; priority=medium; path_priority=neutral.
   Safe first patch: Look for separable responsibilities and tests that protect behavior.
   Verify: inspect nearby tests first, then run the narrowest type-check or test command for the touched package.

3. Large node worth responsibility review in <VStack>
   Evidence: `/Users/byronwall/Projects/comic-books/app/src/components/comps-explorer/DesignSystemOverview.tsx::DesignSystemOverview::<VStack>:1125-2245`; loc=1121; priority=medium; path_priority=neutral.
   Safe first patch: Look for separable responsibilities and tests that protect behavior.
   Verify: inspect nearby tests first, then run the narrowest type-check or test command for the touched package.

4. Complexity hotspot in getPanelRects
   Evidence: `/Users/byronwall/Projects/comic-books/app/src/lib/comics/data.server.ts::getPanelRects:287-468`; complexity=24, loc=182, max_nesting_depth=3, parameter_count=1; priority=medium; path_priority=neutral.
   Safe first patch: Trace the control flow and identify behavior-preserving simplification points.
   Verify: inspect nearby tests first, then run the narrowest type-check or test command for the touched package.

5. Complexity hotspot in getPanelRects
   Evidence: `/Users/byronwall/Projects/comic-books/app/src/components/comics/comic-layouts.ts::getPanelRects:37-217`; complexity=24, loc=181, max_nesting_depth=3, parameter_count=1; priority=medium; path_priority=neutral.
   Safe first patch: Trace the control flow and identify behavior-preserving simplification points.
   Verify: inspect nearby tests first, then run the narrowest type-check or test command for the touched package.
