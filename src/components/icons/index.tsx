import React from 'react'
import Svg, { Path } from 'react-native-svg'

// Monochrome line/fill icons (sourced from Iconify sets). Each takes a square `size` and a
// `color` that drives the path fill (replacing the SVGs' `currentColor`).
type IconProps = { size?: number; color?: string; testID?: string }

const DEFAULT = '#1C2417'

export function BarcodeIcon({ size = 20, color = DEFAULT, testID }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID={testID}>
      <Path fill={color} d="M1 19V5h2v14zm3 0V5h2v14zm3 0V5h1v14zm3 0V5h2v14zm3 0V5h3v14zm4 0V5h1v14zm3 0V5h3v14z" />
    </Svg>
  )
}

export function ReceiptIcon({ size = 20, color = DEFAULT, testID }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID={testID}>
      <Path
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.35 2c.781 0 1.557.47 1.825 1.305l.076.246l.079.28l.08.316l.077.346l.073.376l.034.198l.061.417c.23 1.79.157 4.23-1.122 6.705l-.159.297c-1.342 2.415-1.245 4.846-.942 6.425l.074.349l.038.162l.077.3l.077.262c.274.89-.318 1.922-1.327 2.01l-.14.006H5.65c-.78 0-1.557-.47-1.825-1.305l-.075-.246l-.08-.28l-.08-.316l-.077-.346l-.073-.376q-.036-.195-.066-.403l-.055-.43l-.042-.454c-.127-1.704.065-3.855 1.19-6.033l.159-.297C5.968 9.1 5.87 6.668 5.568 5.09l-.073-.349l-.039-.162l-.077-.3l-.077-.262c-.274-.89.318-1.922 1.327-2.01L6.77 2zM12 12H9a1 1 0 1 0 0 2h3a1 1 0 1 0 0-2m4-4h-6a1 1 0 0 0-.117 1.993L10 10h6a1 1 0 0 0 .117-1.993z"
      />
    </Svg>
  )
}

export function EditIcon({ size = 20, color = DEFAULT, testID }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID={testID}>
      <Path fill={color} d="M18.925 3.137a3.027 3.027 0 0 0-4.283.001l-9.507 9.52a3.03 3.03 0 0 0-.885 2.139V18c0 .414.336.75.75.75h3.223c.803 0 1.573-.32 2.14-.887l9.5-9.506a3.03 3.03 0 0 0 0-4.28zM4 20.25a.75.75 0 0 0 0 1.5h16a.75.75 0 0 0 0-1.5z" />
    </Svg>
  )
}

export function SettingsIcon({ size = 20, color = DEFAULT, testID }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID={testID}>
      <Path
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.279 2.152C13.909 2 13.439 2 12.5 2s-1.408 0-1.779.152a2 2 0 0 0-1.09 1.083c-.094.223-.13.484-.145.863a1.62 1.62 0 0 1-.796 1.353a1.64 1.64 0 0 1-1.579.008c-.338-.178-.583-.276-.825-.308a2.03 2.03 0 0 0-1.49.396c-.318.242-.553.646-1.022 1.453c-.47.807-.704 1.21-.757 1.605c-.07.526.074 1.058.4 1.479c.148.192.357.353.68.555c.477.297.783.803.783 1.361s-.306 1.064-.782 1.36c-.324.203-.533.364-.682.556a2 2 0 0 0-.399 1.479c.053.394.287.798.757 1.605s.704 1.21 1.022 1.453c.424.323.96.465 1.49.396c.242-.032.487-.13.825-.308a1.64 1.64 0 0 1 1.58.008c.486.28.774.795.795 1.353c.015.38.051.64.145.863c.204.49.596.88 1.09 1.083c.37.152.84.152 1.779.152s1.409 0 1.779-.152a2 2 0 0 0 1.09-1.083c.094-.223.13-.483.145-.863c.02-.558.309-1.074.796-1.353a1.64 1.64 0 0 1 1.579-.008c.338.178.583.276.825.308c.53.07 1.066-.073 1.49-.396c.318-.242.553-.646 1.022-1.453c.47-.807.704-1.21.757-1.605a2 2 0 0 0-.4-1.479c-.148-.192-.357-.353-.68-.555c-.477-.297-.783-.803-.783-1.361s.306-1.064.782-1.36c.324-.203.533-.364.682-.556a2 2 0 0 0 .399-1.479c-.053-.394-.287-.798-.757-1.605s-.704-1.21-1.022-1.453a2.03 2.03 0 0 0-1.49-.396c-.242.032-.487.13-.825.308a1.64 1.64 0 0 1-1.58-.008a1.62 1.62 0 0 1-.795-1.353c-.015-.38-.051-.64-.145-.863a2 2 0 0 0-1.09-1.083M12.5 15c1.67 0 3.023-1.343 3.023-3S14.169 9 12.5 9s-3.023 1.343-3.023 3s1.354 3 3.023 3"
      />
    </Svg>
  )
}

export function CanIcon({ size = 20, color = DEFAULT, testID }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 15 15" testID={testID}>
      <Path fill={color} d="M3 2.5c.5 1.5 8.5 1.5 9 0v11c0 2-9 2-9 0zm6.5-1.25c.5 0 1 .25 1 .5s-.5.5-1 .5s-1-.25-1-.5s.5-.5 1-.5m2.5.25C12 0 3 0 3 1.5c0 2 9 2 9 0" />
    </Svg>
  )
}
