This month's highest scorer is **/u/{{points.0.username}}**, with **{{points.0.score}} points**!

{{#fastest}}
The quickest solve was by /u/{{fastest.username}} in [**{{fastest.timeString}}**](https://redd.it/{{fastest.postId}}).
{{/fastest}}
{{#slowest}}
The longest running game was eventually solved by /u/{{slowest.username}}, in [**{{slowest.timeString}}**](https://redd.it/{{slowest.postId}})!
{{/slowest}}

# Top Players for {{month}}:

{{#points}}
1. **/u/{{username}}** with {{score}} points
{{/points}}

# Most Correct Guesses:

{{#guesses}}
1. **/u/{{username}}** with {{score}} correct guesses
{{/guesses}}

# Most Frequent Submitters:

{{#submissions}}
1. **/u/{{username}}** with {{score}} submissions
{{/submissions}}