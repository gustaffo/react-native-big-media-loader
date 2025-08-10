Pod::Spec.new do |s|
  s.name         = "react-native-big-media-loader"
  s.version      = "0.1.0"
  s.summary      = "Large media picker for React Native"
  s.license      = "MIT"
  s.author       = { "Gustaffo" => "office@gustaffo.com" }
  s.homepage     = "https://github.com/gustaffo/react-native-big-media-loader"
  s.source       = { :path => "." }

  s.platforms    = { :ios => "12.0" }

  s.source_files = "ios/**/*.{h,m,mm}"
  s.dependency "React-Core"
end
