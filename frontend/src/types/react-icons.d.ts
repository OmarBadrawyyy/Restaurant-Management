import { ReactNode } from 'react'
import { IconBaseProps } from 'react-icons'

declare module 'react-icons/lib' {
  export type IconType = (props: IconBaseProps) => ReactNode
}

declare module 'react-icons/fa' {
  export const FaChartLine: (props: IconBaseProps) => JSX.Element
  export const FaChartBar: (props: IconBaseProps) => JSX.Element
  export const FaUsers: (props: IconBaseProps) => JSX.Element
  export const FaBoxes: (props: IconBaseProps) => JSX.Element
  export const FaStar: (props: IconBaseProps) => JSX.Element
} 