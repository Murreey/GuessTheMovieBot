Last year, you correctly guessed **{{total.solved}} movies**, posted by {{total.submitters}} submitters and solved by {{total.guessers}} guessers!

{{new.count }} new players scored points for the first time this year - with /u/{{new.top}} taking the top spot as the highest new {{year}} player!

{{#fastest}}
The quickest correct guess of the year was by /u/{{fastest.username}} in just [**{{fastest.timeString}}**](https://redd.it/{{fastest.postId}}).
{{/fastest}}
{{#slowest}}
The trickiest screenshot this year was finally solved after [**{{slowest.timeString}}**](https://redd.it/{{slowest.postId}}) by /u/{{slowest.username}}!
{{/slowest}}

Here are the top players in each category for the entire year:

# Top Players of {{year}}:

{{#points}}
1. **/u/{{username}}**: {{score}}
{{/points}}

# Most Correct Guesses:

{{#guesses}}
1. **/u/{{username}}**: {{score}}
{{/guesses}}

# Most Frequent Submitters:

{{#submissions}}
1. **/u/{{username}}**: {{score}}
{{/submissions}}

# Thanks everyone for playing /r/GuessTheMovie in {{year}}!