'use client'

// Isolates the framer-motion dependency into its own chunk for bundle splitting.
// Components that import from this file will have framer-motion
// in a separate webpack/turbopack chunk rather than inlined.
export { motion, AnimatePresence } from 'framer-motion'
