task :build do
  code = File.read('lib/core.js')
  File.open('sproutcore-objectproxy.js', 'w') do |f|
    f << "(function() {\n#{code}\n})();\n"
  end
end

task :default => :build
