#!/bin/bash
# Script to replace purple with blue colors

# Replace hex colors
find src/app/components/screens -name "*.tsx" -exec sed -i '' 's/#7B56d4/#3B82F6/g' {} +
find src/app/components/screens -name "*.tsx" -exec sed -i '' 's/#6b46c1/#2563EB/g' {} +

# Replace Tailwind classes
find src/app/components/screens -name "*.tsx" -exec sed -i '' 's/purple-50/blue-50/g' {} +
find src/app/components/screens -name "*.tsx" -exec sed -i '' 's/purple-100/blue-100/g' {} +
find src/app/components/screens -name "*.tsx" -exec sed -i '' 's/purple-600/blue-600/g' {} +
find src/app/components/screens -name "*.tsx" -exec sed -i '' 's/purple-700/blue-700/g' {} +
find src/app/components/screens -name "*.tsx" -exec sed -i '' 's/purple-500/blue-500/g' {} +
find src/app/components/screens -name "*.tsx" -exec sed -i '' 's/text-purple/text-blue/g' {} +
find src/app/components/screens -name "*.tsx" -exec sed -i '' 's/bg-purple/bg-blue/g' {} +
find src/app/components/screens -name "*.tsx" -exec sed -i '' 's/border-purple/border-blue/g' {} +

echo "Color replacement complete!"
